// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Simple Mock USDC for the AllocAI Hackathon Demo.
 */
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {}

    /**
     * @dev Mint tokens for testing (18 decimals) - PUBLIC for Hackathon Demo
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
