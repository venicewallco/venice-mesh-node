# Venice Beach Mesh Network

A decentralized mesh network providing free WiFi to Venice Beach visitors while enabling targeted advertising and a token economy.

## 🚀 Project Overview

Venice Mesh is a full-stack solution for community-driven internet access. It combines OpenWrt-based mesh networking with a Node.js backend, a token economy on the Polygon blockchain, and a mobile application for users and merchants.

## 📁 Repository Structure

- **`api/`**: Node.js/Express backend providing RESTful endpoints for mesh management, business advertising, token rewards, and telemetry.
- **`openwrt/`**: Scripts and configuration files for OpenWrt routers, including mesh routing (Batman-adv), captive portal (openNDS), and QoS rules.
- **`mobile/`**: React Native application screens for the user wallet and merchant POS.
- **`blockchain/`**: Solidity smart contracts (ERC-20) and Hardhat deployment scripts for the Venice Mesh Token (VNM).
- **`docker/`**: Deployment configurations for Nginx, Redis, and PostgreSQL.
- **`docs/`**: Detailed documentation on system architecture, API endpoints, and deployment procedures.

## 🛠️ Key Features

- **Decentralized Mesh**: Layer 2 mesh routing using Batman-adv and 802.11s.
- **Seamless Roaming**: 802.11r support for uninterrupted connectivity across nodes.
- **Token Rewards**: Users earn VNM tokens for WiFi usage, which can be spent at local merchants.
- **Targeted Advertising**: Geo-fenced ad campaigns for local businesses on the captive portal.
- **Dynamic QoS**: Bandwidth allocation prioritized for VoIP and video conferencing.
- **Offline Resilience**: SQLite-based request queuing on nodes for when the central API is unreachable.

## 📖 Documentation

- [System Architecture](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)

## 🚦 Quick Start

For detailed instructions on setting up the backend and deploying mesh nodes, please refer to the [Deployment Guide](docs/deployment.md).

---
*Developed for the Venice Beach Community.*
