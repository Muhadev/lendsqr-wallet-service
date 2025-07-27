const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('transactions').del();
  await knex('accounts').del();
  await knex('users').del();

  // Hash passwords
  const password1 = await bcrypt.hash('Password123!', 12);
  const password2 = await bcrypt.hash('Password456!', 12);

  // Insert test users
  const users = await knex('users').insert([
    {
      id: 1,
      email: 'john.doe@example.com',
      phone: '08123456789',
      first_name: 'John',
      last_name: 'Doe',
      bvn: '12345678901',
      password_hash: password1,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      email: 'jane.smith@example.com',
      phone: '08198765432',
      first_name: 'Jane',
      last_name: 'Smith',
      bvn: '10987654321',
      password_hash: password2,
      created_at: new Date(),
      updated_at: new Date(),
    }
  ]);

  // Insert test accounts
  await knex('accounts').insert([
    {
      id: 1,
      user_id: 1,
      account_number: '1234567890',
      balance: 50000.00,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      user_id: 2,
      account_number: '0987654321',
      balance: 25000.00,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    }
  ]);

  // Insert sample transactions
  await knex('transactions').insert([
    {
      account_id: 1,
      type: 'credit',
      amount: 50000.00,
      reference: 'TXN1702825200001',
      status: 'completed',
      description: 'Initial account funding',
      created_at: new Date(Date.now() - 86400000), // 1 day ago
      updated_at: new Date(Date.now() - 86400000),
    },
    {
      account_id: 2,
      type: 'credit',
      amount: 25000.00,
      reference: 'TXN1702825200002',
      status: 'completed',
      description: 'Initial account funding',
      created_at: new Date(Date.now() - 86400000), // 1 day ago
      updated_at: new Date(Date.now() - 86400000),
    }
  ]);
};