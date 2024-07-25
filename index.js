const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// GoDaddy API credentials
const apiKey = process.env.GODADDY_API_KEY;
const apiSecret = process.env.GODADDY_API_SECRET;
// Interval for checking IP address (in milliseconds)
const interval = process.env.INTERVAL || 300000; // Default is 5 minutes (300,000 ms)

// Domains details
const domains = process.env.DOMAINS.split(',');

// File to store the last known IP for each domain
const lastIpFile = path.join(__dirname, 'last_ip.json');

// Get the current public IP address
const getCurrentIp = async () => {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    return response.data.ip;
  } catch (error) {
    console.error('Error fetching current IP address:', error);
    throw error;
  }
};

// Update the DNS record on GoDaddy
const updateDnsRecord = async (domain, ip) => {
  const url = `https://api.godaddy.com/v1/domains/${domain}/records/A/@`;
  const headers = {
    'Authorization': `sso-key ${apiKey}:${apiSecret}`,
    'Content-Type': 'application/json',
  };
  const data = [
    {
      'data': ip,
      'ttl': 600,
    },
  ];

  try {
    await axios.put(url, data, { headers });
    console.log(`DNS record for ${domain} updated successfully to IP: ${ip}`);
  } catch (error) {
    console.error(`Error updating DNS record for ${domain}:`, error);
    throw error;
  }
};

// Read the last known IP address from file
const getLastKnownIps = () => {
  if (fs.existsSync(lastIpFile)) {
    return JSON.parse(fs.readFileSync(lastIpFile, 'utf8'));
  }
  return {};
};

// Write the current IP address to file
const setLastKnownIps = (ips) => {
  fs.writeFileSync(lastIpFile, JSON.stringify(ips, null, 2), 'utf8');
};

// Main function
const main = async () => {
  try {
    const currentIp = await getCurrentIp();
    const lastKnownIps = getLastKnownIps();

    for (const domain of domains) {
      if (currentIp !== lastKnownIps[domain]) {
        await updateDnsRecord(domain, currentIp);
        lastKnownIps[domain] = currentIp;
      } else {
        console.log(`IP address for ${domain} has not changed.`);
      }
    }

    setLastKnownIps(lastKnownIps);
  } catch (error) {
    console.error('Error in main function:', error);
  }
};

main();
setInterval(main, interval);