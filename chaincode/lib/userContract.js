/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const { Contract } = require('fabric-contract-api');

class UserContract extends Contract {
    constructor() {
        super('regnet.user');
    }

    async instantiate(ctx) {
        console.log('User smart contract was successfully deployed!');
    }

    async userExists(ctx, userKey) {
        const buffer = await ctx.stub.getState(userKey);
        return !!buffer && buffer.length > 0;
    }

    // 1. Request new user account = requestNewUser(ctx, name, email, phone, ssn)
    async createUserRequest(ctx, name, email, phone, ssn) {
        // Generate the composite key for the user request
        const requestKey = ctx.stub.createCompositeKey('org.example.propertyregistration.request', [name, ssn]);

        // Check if the request already exists
        const requestExists = await ctx.stub.getState(requestKey);
        if (requestExists) {
            throw new Error(`User request with name ${name} and SSN ${ssn} already exists`);
        }

        // Get the timestamp of the transaction
        const timestamp = ctx.stub.getTxTimestamp();
        const createdAt = new Date(timestamp.seconds.low * 1000).toISOString();

        // Create the request object
        const request = {
            name,
            email,
            phone,
            ssn,
            createdAt
        };

        // Store the request object on the ledger
        await ctx.stub.putState(requestKey, Buffer.from(JSON.stringify(request)));

        // Return the request object
        return request;
    }

    // 2. Recharge user account = rechargeAccount(ctx, name, ssn, bankTxnId)
    async rechargeAccount(ctx, name, ssn, bankTxnId) {
        const userKey = ctx.stub.createCompositeKey('org.example.propertyregistration.user', [name, ssn]);

        const userExists = await this.userExists(ctx, userKey);
        if (!userExists) {
            throw new Error(`User with name ${name} and SSN ${ssn} does not exist`);
        }

        // Define the predefined transaction IDs and associated upgradCoins amounts
        const transactionIds = {
            upg100: 100,
            upg500: 500,
            upg1000: 1000
        };

        // Check if the bank transaction ID is valid
        if (!transactionIds.hasOwnProperty(bankTxnId)) {
            throw new Error('Invalid Bank Transaction ID');
        }

        // Fetch the user from the ledger
        const userBuffer = await ctx.stub.getState(userKey);
        const user = JSON.parse(userBuffer.toString());

        // Update the upgradCoins attribute
        const transactionAmount = transactionIds[bankTxnId];
        user.upgradCoins += transactionAmount;

        // Store the updated user on the ledger
        await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(user)));

        return `Account recharged with ${transactionAmount} upgradCoins. Total upgradCoins: ${user.upgradCoins}`;
    }
    // 3. Get user asset details = viewUser(ctx, name, ssn)
    async viewUser(ctx, name, ssn) {
        const userKey = ctx.stub.createCompositeKey('org.example.propertyregistration.user', [name, ssn]);

        const userBuffer = await ctx.stub.getState(userKey);
        if (!userBuffer || userBuffer.length === 0) {
            throw new Error(`User with name ${name} and SSN ${ssn} does not exist`);
        }

        const user = JSON.parse(userBuffer.toString());
        return user;
    }
    // 4. Register new property request = propertyRegistrationRequest(ctx, propId, price, ownerName, ownerSsn)
    async propertyRegistrationRequest(ctx, propId, price, ownerName, ownerSsn) {
        // Check if the owner exists in the ledger
        const ownerKey = ctx.stub.createCompositeKey('org.example.propertyregistration.propertyRequest', [ownerName, ownerSsn]);
        const ownerBuffer = await ctx.stub.getState(ownerKey);

        if (!ownerBuffer || ownerBuffer.length === 0) {
            throw new Error(`Owner with name ${ownerName} and SSN ${ownerSsn} does not exist`);
        }

        // Create the property request object
        const request = {
            propId,
            owner: ownerKey,
            price,
            status: 'registered'
        };

        // Store the property request object on the ledger
        await ctx.stub.putState(propId, Buffer.from(JSON.stringify(request)));

        // Return the property request object
        return request;
    }
    // 5. Get property details = viewProperty(ctx, propId)
    async viewProperty(ctx, propId) {
        const propertyKey = ctx.stub.createCompositeKey('org.example.propertyregistration.property', [propId]);

        const propertyBuffer = await ctx.stub.getState(propertyKey);
        if (!propertyBuffer || propertyBuffer.length === 0) {
            throw new Error(`Property with ID ${propId} does not exist`);
        }

        const property = JSON.parse(propertyBuffer.toString());
        return property;
    }
    // 6. Update property details = updateProperty(ctx, propId, status, ownerName, ownerSsn)
    async updateProperty(ctx, propId, status, ownerName, ownerSsn) {
        // Verify if the user invoking the function is the property's owner
        const ownerKey = ctx.stub.createCompositeKey('org.example.propertyregistration.user', [ownerName, ownerSsn]);
        const propertyKey = ctx.stub.createCompositeKey('org.example.propertyregistration.property', [propId]);

        const propertyBuffer = await ctx.stub.getState(propertyKey);
        if (!propertyBuffer || propertyBuffer.length === 0) {
            throw new Error(`Property with ID ${propId} does not exist`);
        }

        const property = JSON.parse(propertyBuffer.toString());

        if (property.owner !== ownerKey) {
            throw new Error(`User with name ${ownerName} and SSN ${ownerSsn} is not the owner of the property`);
        }

        // Update the property's status
        property.status = status;

        // Store the updated property on the ledger
        await ctx.stub.putState(propertyKey, Buffer.from(JSON.stringify(property)));

        return property;
    }
    // 7. Purchase property = purchaseProperty(ctx, propId, name, ssn)
    async purchaseProperty(ctx, propId, buyerName, buyerSsn) {
        const buyerKey = ctx.stub.createCompositeKey('org.example.propertyregistration.user', [buyerName, buyerSsn]);
        const propertyKey = ctx.stub.createCompositeKey('org.example.propertyregistration.property', [propId]);

        // Fetch the property from the ledger
        const propertyBuffer = await ctx.stub.getState(propertyKey);
        if (!propertyBuffer || propertyBuffer.length === 0) {
            throw new Error(`Property with ID ${propId} does not exist`);
        }

        const property = JSON.parse(propertyBuffer.toString());

        // Verify if the property is listed for sale
        if (property.status !== 'onSale') {
            throw new Error(`Property with ID ${propId} is not listed for sale`);
        }

        // Fetch the buyer's account balance from the ledger
        const buyerBuffer = await ctx.stub.getState(buyerKey);
        if (!buyerBuffer || buyerBuffer.length === 0) {
            throw new Error(`Buyer with name ${buyerName} and SSN ${buyerSsn} does not exist`);
        }

        const buyer = JSON.parse(buyerBuffer.toString());

        // Check if the buyer has sufficient account balance
        const propertyPrice = property.price;
        if (buyer.upgradCoins < propertyPrice) {
            throw new Error(`Buyer with name ${buyerName} and SSN ${buyerSsn} does not have sufficient account balance`);
        }

        // Deduct the property price from the buyer's account balance
        buyer.upgradCoins -= propertyPrice;

        // Update the property's owner and status
        property.owner = buyerKey;
        property.status = 'registered';

        // Update the buyer's account balance on the ledger
        await ctx.stub.putState(buyerKey, Buffer.from(JSON.stringify(buyer)));

        // Update the property on the ledger
        await ctx.stub.putState(propertyKey, Buffer.from(JSON.stringify(property)));

        return property;
    }
}

module.exports = UserContract;
