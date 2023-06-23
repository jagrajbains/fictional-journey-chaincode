/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// to deploy a chaincode to a channel.
// ===> from directory /test-network
// ./network.sh deployCC -ccn propertyregistration -ccp ../chaincode/ -ccl javascript
'use strict';

const assetTransfer = require('./lib/assetTransfer');

const userContract = require('./lib/userContract');
const registrarContract = require('./lib/registrarContract');

module.exports.AssetTransfer = assetTransfer;
module.exports.contracts = [userContract, registrarContract];
