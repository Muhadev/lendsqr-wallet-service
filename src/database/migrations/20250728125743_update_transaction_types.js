// src/database/migrations/20250728125743_update_transaction_types.js
// This migration was likely created but left empty. 
// Either implement it or remove it to avoid warnings.

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // If this migration was meant to update transaction types to uppercase,
  // but it's already handled in migration 004, then just return resolved promise
  return Promise.resolve();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // Rollback operation
  return Promise.resolve();
};