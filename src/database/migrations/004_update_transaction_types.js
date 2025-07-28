// Create this file: src/database/migrations/004_update_transaction_types.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Step 1: Update existing data to uppercase
    await trx('transactions')
      .where('type', 'credit')
      .update('type', 'CREDIT');
    
    await trx('transactions')
      .where('type', 'debit')
      .update('type', 'DEBIT');
    
    // Step 2: For MySQL, we need to modify the enum constraint
    // First, let's add a temporary column
    await trx.schema.table('transactions', function(table) {
      table.enum('type_new', ['CREDIT', 'DEBIT']).nullable();
    });
    
    // Step 3: Copy data to new column
    await trx.raw(`
      UPDATE transactions 
      SET type_new = CASE 
        WHEN type = 'credit' THEN 'CREDIT'
        WHEN type = 'debit' THEN 'DEBIT'
        ELSE type
      END
    `);
    
    // Step 4: Drop old column and rename new one
    await trx.schema.table('transactions', function(table) {
      table.dropColumn('type');
    });
    
    await trx.schema.table('transactions', function(table) {
      table.renameColumn('type_new', 'type');
    });
    
    // Step 5: Make the column non-nullable
    await trx.schema.alterTable('transactions', function(table) {
      table.enum('type', ['CREDIT', 'DEBIT']).notNullable().alter();
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Reverse the process
    await trx.schema.table('transactions', function(table) {
      table.enum('type_new', ['credit', 'debit']).nullable();
    });
    
    await trx.raw(`
      UPDATE transactions 
      SET type_new = CASE 
        WHEN type = 'CREDIT' THEN 'credit'
        WHEN type = 'DEBIT' THEN 'debit'
        ELSE LOWER(type)
      END
    `);
    
    await trx.schema.table('transactions', function(table) {
      table.dropColumn('type');
    });
    
    await trx.schema.table('transactions', function(table) {
      table.renameColumn('type_new', 'type');
    });
    
    await trx.schema.alterTable('transactions', function(table) {
      table.enum('type', ['credit', 'debit']).notNullable().alter();
    });
  });
};