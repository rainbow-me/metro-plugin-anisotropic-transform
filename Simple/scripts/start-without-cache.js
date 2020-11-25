const { execSync } = require('child_process');

const PORT = 8081;

execSync(`kill-port ${PORT}`, {stdio: 'inherit'});
execSync('react-native start --reset-cache&', {stdio: 'inherit'});

(async () => {
  await new Promise(resolve => setTimeout(resolve, 7000));
  execSync(`kill-port ${PORT}`, {stdio: 'inherit'});
  execSync('yarn ios', {stdio: 'inherit'});
})();

