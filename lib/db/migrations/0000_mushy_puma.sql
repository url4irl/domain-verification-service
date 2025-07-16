CREATE TABLE "domains" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "domains_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"ip" varchar(255) NOT NULL,
	"customerId" varchar(255),
	"isVerified" boolean DEFAULT false NOT NULL,
	"verificationToken" varchar(64),
	"tokenExpiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "domains_name_customerId_unique" UNIQUE("name","customerId")
);
--> statement-breakpoint
CREATE TABLE "verification_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "verification_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"domainId" integer NOT NULL,
	"customerId" varchar(255) NOT NULL,
	"verificationStep" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"details" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification_logs" ADD CONSTRAINT "verification_logs_domainId_domains_id_fk" FOREIGN KEY ("domainId") REFERENCES "public"."domains"("id") ON DELETE no action ON UPDATE no action;