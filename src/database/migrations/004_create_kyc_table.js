/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = (knex) =>
  knex.schema.createTable("kyc_documents", (table) => {
    table.increments("id").primary()
    table.integer("user_id").unsigned().notNullable()
    table.enum("document_type", ["national_id", "drivers_license", "passport", "voters_card"]).notNullable()
    table.string("document_number", 50).notNullable()
    table.text("document_url").nullable()
    table.enum("status", ["pending", "approved", "rejected", "expired"]).defaultTo("pending")
    table.timestamp("verification_date").nullable()
    table.text("rejection_reason").nullable()
    table.timestamps(true, true)

    // Foreign key constraint
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE")

    // Indexes for better performance
    table.index(["user_id"])
    table.index(["status"])
    table.index(["document_type"])

    // Unique constraint to prevent duplicate documents per user
    table.unique(["user_id", "document_type"])
  })

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = (knex) => knex.schema.dropTableIfExists("kyc_documents")
