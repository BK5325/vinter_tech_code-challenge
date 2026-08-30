const requiredVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'NODE_ENV',
];

const validateEnv = () => {
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file. See .env.example for reference.\n');
    process.exit(1);
  }

  console.log('✅ Environment variables validated.');
};

module.exports = { validateEnv };
