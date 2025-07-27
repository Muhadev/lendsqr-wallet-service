/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('accounts', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('account_number', 10).notNullable().unique();
    table.decimal('balance', 15, 2).notNullable().defaultTo(0);
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active');
    table.timestamps(true, true);
    
    // Foreign key constraint
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Indexes for better performance
    table.index(['user_id']);
    table.index(['account_number']);
    table.index(['status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('accounts');
};