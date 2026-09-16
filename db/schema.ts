import {sqliteTable,text,integer,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),kind:text('kind').notNull(),data:text('data').notNull(),updated:integer('updated').notNull()});
export const slots=sqliteTable('slots',{id:integer('id').primaryKey({autoIncrement:true}),booking:text('booking').notNull(),barber:text('barber').notNull(),day:text('day').notNull(),minute:integer('minute').notNull()},t=>[uniqueIndex('slot_unique').on(t.barber,t.day,t.minute)]);
