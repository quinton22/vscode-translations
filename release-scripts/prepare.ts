if (process.argv.length < 3) {
  console.error('Missing required parameter {version}');
  process.exit(1);
}

console.log(process.argv[2]);
