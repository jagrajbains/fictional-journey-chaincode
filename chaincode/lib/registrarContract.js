/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const { Contract } = require('fabric-contract-api');

class RegistrarContract extends Contract {
    constructor() {
        super('regnet.registrar');
    }

    async instantiate(ctx) {
        console.log('Registrar smart contract was successfully deployed!');
    }

    // 1. Approve existing user request = approveNewUser(ctx, name, ssn)
    async approveNewUser(ctx, name, ssn) {
        // Get the user request from the ledger
        const requestKey = ctx.stub.createCompositeKey('org.example.propertyregistration.request', [name, ssn]);
        const requestBuffer = await ctx.stub.getState(requestKey);

        if (!requestBuffer || requestBuffer.length === 0) {
            throw new Error(`User request with name ${name} and SSN ${ssn} does not exist`);
        }

        // Parse the request object from the buffer
        const request = JSON.parse(requestBuffer.toString());

        // Create the user asset
        const userKey = ctx.stub.createCompositeKey('org.example.propertyregistration.user', [name, ssn]);
        const userExists = await this.userExists(ctx, userKey);

        if (userExists) {
            throw new Error(`User with name ${name} and SSN ${ssn} already exists`);
        }

        const newUser = {
            name,
            email: request.email,
            phone: request.phone,
            ssn,
            createdAt: request.createdAt,
            upgradCoins: 0 // Initial value of upgradCoins set to 0
        };

        // Store the user asset on the ledger
        await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(newUser)));

        // Delete the user request from the ledger
        await ctx.stub.deleteState(requestKey);

        // Return the user asset
        return newUser;
    }

    async userExists(ctx, userKey) {
        const buffer = await ctx.stub.getState(userKey);
        return !!buffer && buffer.length > 0;
    }

    // 2. Get user asset details = viewUser(ctx, name, ssn)
    async viewUser(ctx, name, ssn) {
        const userKey = ctx.stub.createCompositeKey('org.example.propertyregistration.user', [name, ssn]);

        const userBuffer = await ctx.stub.getState(userKey);
        if (!userBuffer || userBuffer.length === 0) {
            throw new Error(`User with name ${name} and SSN ${ssn} does not exist`);
        }

        const user = JSON.parse(userBuffer.toString());
        return user;
    }
    // 3. Approve existing property registration request = approvePropertyRegistration(ctx, propId)
    async approvePropertyRequest(ctx, propId) {
        // Fetch the property request from the ledger
        const requestBuffer = await ctx.stub.getState(propId);

        if (!requestBuffer || requestBuffer.length === 0) {
            throw new Error(`Property request with ID ${propId} does not exist`);
        }

        const request = JSON.parse(requestBuffer.toString());

        // Create the Property asset
        const property = {
            propId,
            owner: request.owner,
            price: request.price,
            status: request.status
        };

        // Store the Property asset on the ledger
        const propertyKey = ctx.stub.createCompositeKey('org.example.propertyregistration.property', [propId]);
        await ctx.stub.putState(propertyKey, Buffer.from(JSON.stringify(property)));

        // Delete the Property request from the ledger
        await ctx.stub.deleteState(propId);

        return property;
    }
    // 4. Get property asset details from network = viewProperty(ctx, propId)
    async viewProperty(ctx, propId) {
        const propertyKey = ctx.stub.createCompositeKey('org.example.propertyregistration.property', [propId]);

        const propertyBuffer = await ctx.stub.getState(propertyKey);
        if (!propertyBuffer || propertyBuffer.length === 0) {
            throw new Error(`Property with ID ${propId} does not exist`);
        }

        const property = JSON.parse(propertyBuffer.toString());
        return property;
    }
}

module.exports = RegistrarContract;