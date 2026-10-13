import type { Knex } from "knex";


/** owner_ingest held an `ingested_at` timestamp, now a block height. 0 seeds it from the tip */
export async function up(knex: Knex): Promise<void> {
	await knex('states').where('pname', 'owner_ingest').update({ value: 0 })
}


export async function down(knex: Knex): Promise<void> {
}
