/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('transactions', function(table) {
    table.increments('id').primary();
    table.integer('account_id').unsigned().notNullable();
    table.enum('type', ['credit', 'debit']).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.integer('recipient_id').unsigned().nullable();
    table.string('reference', 100).notNullable().unique();
    table.enum('status', ['pending', 'completed', 'failed', 'reversed']).defaultTo('pending');
    table.text('description').nullable();
    table.timestamps(true, true);
    
    // Foreign key constraints
    table.foreign('account_id').references('id').inTable('accounts').onDelete('CASCADE');
    table.foreign('recipient_id').references('id').inTable('accounts').onDelete('SET NULL');
    
    // Indexes for better performance
    table.index(['account_id']);
    table.index(['type']);
    table.index(['status']);
    table.index(['reference']);
    table.index(['created_at']);
    table.index(['recipient_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('transactions');
};