import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
	await knex.schema.alterTable('reported_txids', (table) => {
		table.string('origin').nullable()
	})
}


export async function down(knex: Knex): Promise<void> {
	await knex.schema.alterTable('reported_txids', (table) => {
		table.dropColumn('origin')
	})
}

