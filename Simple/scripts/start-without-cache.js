const { execSync } = require('child_process');

/* to test metro we must purge the cache first */
execSync('kill-port 8081', {stdio: 'inherit'});
execSync('react-native start --reset-cache&', {stdio: 'inherit'});

(async () => {
  await new Promise(resolve => setTimeout(resolve, 7000));
  execSync('kill-port 8081', {stdio: 'inherit'});
  execSync('yarn ios', {stdio: 'inherit'});
})();

