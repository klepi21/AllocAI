// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// --- Standard ERC20 Interface ---
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/**
 * @title AllocAIVault
 * @dev Core execution vault for the AllocAI Autonomous Agent.
 */
contract AllocAIVault {
    // --- State Variables ---
    address public owner;
    address public authorizedAgent;
    address public USDC_TOKEN; // Configurable for Testnet/Mainnet
    address public constant LUCID_CONTROLLER = 0x92E2391d0836e10b9e5EAB5d56BfC286Fadec25b;
    address public constant L_USDC_TOKEN = 0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e;

    // --- Kite Ecosystem Official Addresses (Verified) ---
    address public constant SERVICE_REGISTRY = 0xc67a4AbcD8853221F241a041ACb1117b38DA587F;
    // DEPRECATED: ACCOUNT_FACTORY = 0xF0Fc19F0dc393867F19351d25EDfc5E099561cb7;
    
    // Dynamic Bridge Address (Discovered via Service Registry or LayerZero Executor)
    // Lucid bridging on Kite uses LayerZero: 0xe93685f3bBA03016F02bD1828BaDD6195988D950
    address public bridgeAggregator;

    struct Strategy {
        string protocol;
        string chain;
        uint256 currentApr;
        uint256 lastUpdate;
    }

    uint256 public kiteServiceId;
    bool public isRegisteredService;

    Strategy public activeStrategy;
    mapping(address => uint256) public userShares;
    uint256 public totalShares;

    modifier onlyAuthorized() {
        require(msg.sender == owner || msg.sender == authorizedAgent, "Not authorized");
        _;
    }

    // --- Events ---
    event Deposit(address indexed user, uint256 assets, uint256 shares, string sourceChain);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);
    event ReallocationInitiated(string toProtocol, string toChain, uint256 newApr, bytes32 indexed proofHash);

    constructor(address _agent, address _usdc) {
        owner = msg.sender;
        authorizedAgent = _agent;
        USDC_TOKEN = _usdc;
        
        // Default Strategy
        activeStrategy = Strategy("Lucid Native", "Kite AI", 585, block.timestamp);
    }

    // --- Core Functions ---

    /**
     * @dev Returns total USDC managed by the vault (on-chain balance).
     */
    function totalAssets() public view returns (uint256) {
        return IERC20(USDC_TOKEN).balanceOf(address(this));
    }

    /**
     * @dev REAL TOKEN DEPOSIT: Pulls USDC and mints Shares (Receipts).
     */
    function deposit(uint256 _assets, string memory _sourceChain) external {
        uint256 _totalAssets = totalAssets();
        uint256 _shares = (totalShares == 0) ? _assets : (_assets * totalShares) / _totalAssets;

        bool success = IERC20(USDC_TOKEN).transferFrom(msg.sender, address(this), _assets);
        require(success, "USDC transfer failed");

        userShares[msg.sender] += _shares;
        totalShares += _shares;

        emit Deposit(msg.sender, _assets, _shares, _sourceChain);
    }

    /**
     * @dev User withdraws their assets based on their current share value (Principal + Yield).
     */
    function withdraw(uint256 _assets) external {
        uint256 _totalAssets = totalAssets();
        // Calculate shares corresponding to requested assets: Shares = Assets * TotalShares / TotalAssets
        uint256 _shares = (_assets * totalShares) / _totalAssets;
        
        require(userShares[msg.sender] >= _shares, "Insufficient share balance");
        
        userShares[msg.sender] -= _shares;
        totalShares -= _shares;

        bool success = IERC20(USDC_TOKEN).transfer(msg.sender, _assets);
        require(success, "Withdraw transfer failed");

        emit Withdraw(msg.sender, _assets, _shares);
    }

    /**
     * @dev The "Agent Switch": Only the AI Agent or Owner can trigger a move.
     * Executes arbitrary real-money yield deployments on-chain (e.g., to Lucid Controller).
     */
    /**
     * @dev Dynamically discovers the official Bridge from the Kite Service Registry.
     */
    function updateBridgeFromRegistry() external onlyAuthorized {
        // address discovered = IServiceRegistry(SERVICE_REGISTRY).getServiceAddress("Lucid LayerZero Bridge");
        // bridgeAggregator = discovered;
        
        // FOR MAINNET: We set the verified LayerZero Executor shared by the Kite Team.
        bridgeAggregator = 0xe93685f3bBA03016F02bD1828BaDD6195988D950;
    }

    /**
     * @dev Executes arbitrary real-money yield deployments on-chain.
     */
    function reallocate(
        string memory _protocol, 
        string memory _chain, 
        uint256 _newApr,
        bytes32 _proofHash,
        address _targetContract,
        bytes calldata _executionData
    ) external onlyAuthorized {
        activeStrategy.protocol = _protocol;
        activeStrategy.chain = _chain;
        activeStrategy.currentApr = _newApr;
        activeStrategy.lastUpdate = block.timestamp;

        bytes32 kiteChainHash = keccak256(abi.encodePacked("Kite AI"));
        bytes32 targetChainHash = keccak256(abi.encodePacked(_chain));

        if (targetChainHash != kiteChainHash && bridgeAggregator != address(0)) {
            // Updated LayerZero / Lucid bridge call logic
            (bool bridgeSuccess, ) = bridgeAggregator.call(
                abi.encodeWithSignature("send(address,uint256,string)", USDC_TOKEN, totalAssets(), _chain)
            );
            require(bridgeSuccess, "LayerZero cross-chain bridge request failed");
        } 
        else if (_targetContract != address(0) && _executionData.length > 0) {
            (bool success, ) = _targetContract.call(_executionData);
            require(success, "Agent execution failed on destination protocol");
        }

        emit ReallocationInitiated(_protocol, _chain, _newApr, _proofHash);
    }

    /**
     * @dev Returns the current yield accrued since last update (linear approximation)
     */
    function getEstimatedGrowth() external view returns (uint256) {
        uint256 timePassed = block.timestamp - activeStrategy.lastUpdate;
        // Calculation: balance * apr * time / secondsInYear
        return (totalAssets() * activeStrategy.currentApr * timePassed) / (10000 * 31536000);
    }

    // --- Administration ---

    /**
     * @dev Official Onboarding to Kite App Store (Service Registry).
     * This makes AllocAI discoverable by other agents in the ecosystem.
     */
    function registerAsKiteService(
        string memory _pricingModel, 
        uint256 _unitPrice, 
        string memory _metadata
    ) external onlyAuthorized {
        // ABI: registerService(string serviceType, string pricingModel, uint256 unitPrice, string metadata)
        (bool success, bytes memory data) = SERVICE_REGISTRY.call(
            abi.encodeWithSignature(
                "registerService(string,string,uint256,string)", 
                "Autonomous Yield Vault", 
                _pricingModel, 
                _unitPrice, 
                _metadata
            )
        );
        require(success, "Registration on Kite App Store failed");
        
        kiteServiceId = abi.decode(data, (uint256));
        isRegisteredService = true;
    }

    function updateAgent(address _newAgent) external {
        require(msg.sender == owner, "Only owner");
        authorizedAgent = _newAgent;
    }

    function getVaultStatus() external view returns (string memory, string memory, uint256) {
        return (activeStrategy.protocol, activeStrategy.chain, activeStrategy.currentApr);
    }
}
