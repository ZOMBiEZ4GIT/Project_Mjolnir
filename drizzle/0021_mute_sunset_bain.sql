CREATE TABLE "classification_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"original_saver_key" varchar(50),
	"original_category_key" varchar(50),
	"corrected_saver_key" varchar(50) NOT NULL,
	"corrected_category_key" varchar(50) NOT NULL,
	"merchant_description" varchar(512) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_daily" (
	"log_date" date PRIMARY KEY NOT NULL,
	"weight_kg" numeric(6, 2),
	"body_fat_pct" numeric(5, 2),
	"lean_mass_kg" numeric(6, 2),
	"bmi" numeric(5, 2),
	"resting_hr" numeric(5, 1),
	"hrv_ms" numeric(6, 1),
	"vo2_max" numeric(5, 1),
	"respiratory_rate" numeric(5, 1),
	"hr_avg" numeric(5, 1),
	"hr_min" numeric(5, 1),
	"hr_max" numeric(5, 1),
	"sleep_total_hrs" numeric(5, 2),
	"sleep_deep_hrs" numeric(5, 2),
	"sleep_rem_hrs" numeric(5, 2),
	"sleep_core_hrs" numeric(5, 2),
	"sleep_awake_hrs" numeric(5, 2),
	"sleep_start" text,
	"sleep_end" text,
	"wrist_temp_c" numeric(5, 2),
	"breathing_disturbances" numeric(5, 1),
	"steps" integer,
	"active_energy_kj" numeric(10, 2),
	"basal_energy_kj" numeric(10, 2),
	"exercise_minutes" integer,
	"stand_hours" integer,
	"stand_minutes" integer,
	"distance_km" numeric(10, 3),
	"daylight_minutes" integer,
	"calories_kj" numeric(10, 2),
	"protein_g" numeric(8, 2),
	"carbs_g" numeric(8, 2),
	"fat_g" numeric(8, 2),
	"fibre_g" numeric(8, 2),
	"water_ml" numeric(10, 2),
	"caffeine_mg" numeric(8, 2),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "health_workouts" (
	"workout_date" date NOT NULL,
	"workout_type" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text,
	"duration_minutes" integer,
	"distance_km" numeric(10, 3),
	"active_energy_kj" numeric(10, 2),
	"is_indoor" boolean,
	"hr_avg" integer,
	"hr_min" integer,
	"hr_max" integer,
	"hr_recovery" integer,
	"temperature_c" numeric(5, 2),
	"humidity_pct" integer,
	"updated_at" timestamp with time zone,
	CONSTRAINT "health_workouts_workout_date_start_time_workout_type_unique" UNIQUE("workout_date","start_time","workout_type")
);
--> statement-breakpoint
ALTER TABLE "classification_corrections" ADD CONSTRAINT "classification_corrections_transaction_id_up_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."up_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classification_corrections_merchant_idx" ON "classification_corrections" USING btree ("merchant_description");--> statement-breakpoint
CREATE INDEX "classification_corrections_corrected_idx" ON "classification_corrections" USING btree ("corrected_saver_key","corrected_category_key");--> statement-breakpoint
CREATE INDEX "health_workouts_workout_date_idx" ON "health_workouts" USING btree ("workout_date");