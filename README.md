This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Payments and order email

The payment flow stores a pending order in Neon before sending the customer to PhonePe. The signed PhonePe callback must match that stored transaction and amount before the order is marked paid and its summary is sent with Resend.

Configure these server-side environment variables in Vercel (do not use `NEXT_PUBLIC_` for secrets):

- `DATABASE_URL`: Neon Postgres connection string.
- `RESEND_API_KEY`: Resend API key.
- `RESEND_FROM_EMAIL`: sender address verified with Resend, for example `Akiyo Orders <orders@your-domain.example>`.
- `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, and `PHONEPE_SALT_INDEX`: live PhonePe merchant credentials.
- `PHONEPE_ENV=PRODUCTION` and `NEXT_PUBLIC_BASE_URL=https://your-production-domain`.
- `NEXT_PUBLIC_UPI_VPA`, `NEXT_PUBLIC_UPI_NAME`, and `NEXT_PUBLIC_UPI_BANK_NAME` remain storefront account details, not credentials.

The Neon order table is created on first payment initiation; `db/schema.sql` contains the equivalent schema for review or manual setup. Add variables to Vercel Production and redeploy. Preview deployments should use separate test credentials and a separate database.

The email currently includes the verified order summary and links to each catalog artwork URL. The repository does not contain high-resolution ZIP/download files, so upload actual deliverables to private object storage and add secure download URLs before advertising ZIP or 4K delivery.
