import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
	await knex('states').whereIn('pname', ['indexer_pass1', 'indexer_pass2']).update({ value: 0 })
}


export async function down(knex: Knex): Promise<void> {
}
