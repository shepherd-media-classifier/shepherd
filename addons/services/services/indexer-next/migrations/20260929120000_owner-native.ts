import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
	await knex.schema.alterTable('owners_list', (table) => {
		table.string('owner_native', 64).nullable()
	})
	await knex.schema.alterTable('reported_owners', (table) => {
		table.string('owner_native', 64).nullable()
	})
	await knex.raw(`UPDATE owners_list SET owner_native = trim(owner) WHERE length(owner) <> 43`) //legacy padded 0x owners
}


export async function down(knex: Knex): Promise<void> {
	await knex.schema.alterTable('owners_list', (table) => {
		table.dropColumn('owner_native')
	})
	await knex.schema.alterTable('reported_owners', (table) => {
		table.dropColumn('owner_native')
	})
}
