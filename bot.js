const axios = require('axios');
const ethers = require('ethers');
const fs = require('fs');
const colors = require('colors'); // To add colors to the text

// Clear screen before starting the bot
console.clear();

// Banner
const banner = `
███████╗ █████╗ ██╗      ██████╗ ██████╗ ███╗   ██╗
██╔════╝██╔══██╗██║     ██╔════╝██╔═══██╗████╗  ██║
█████╗  ███████║██║     ██║     ██║   ██║██╔██╗ ██║
██╔══╝  ██╔══██║██║     ██║     ██║   ██║██║╚██╗██║
██║     ██║  ██║███████╗╚██████╗╚██████╔╝██║ ╚████║
╚═╝     ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝
`.blue;

console.log(banner);

// Read proxies from proxies.txt
const proxies = fs.readFileSync('proxies.txt', 'utf-8').split('\n').filter(Boolean);

// Read referral link from link.txt
let referralLink;
try {
    referralLink = fs.readFileSync('link.txt', 'utf-8').trim();
    if (!referralLink) throw new Error('Referral link file is empty!');
} catch (error) {
    console.error('✖ Error reading referral link:'.red, error.message);
    process.exit(1);
}

// Function to wait for a few seconds (asynchronous delay)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to generate a random private key
function generateRandomPrivateKey() {
    return ethers.Wallet.createRandom().privateKey;
}

// Function to connect wallet and sign
async function connectWallet(privateKey) {
    const wallet = new ethers.Wallet(privateKey);
    const message = 'Welcome to GamerBoom!';
    const signature = await wallet.signMessage(message);
    await delay(3000); // 3-second delay after wallet connection
    return { wallet, signature };
}

// Function to login/register
async function loginOrRegister(walletAddress, signature, referralLink) {
    try {
        const response = await axios.post('https://app.gamerboom.org/api/assets/wallet/login_or_register/', {
            chainId: 1,
            address: walletAddress,
            gbInviteCode: referralLink.split('/i/')[1]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${signature}`
            }
        });
        await delay(5000); // 5-second delay after login/register
        return response.data.token;
    } catch (error) {
        console.error('✖ Error during login/register:'.red, error.response ? error.response.data : error.message);
        throw error;
    }
}

// Function to get all tasks
async function getAllTasks(token) {
    try {
        const response = await axios.get('https://app.gamerboom.org/api/social/social-reward-rules/?seasonId=7&size=15', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        await delay(3000); // 3-second delay after fetching tasks
        return response.data.results;
    } catch (error) {
        console.error('✖ Error fetching tasks:'.red, error.response ? error.response.data : error.message);
        throw error;
    }
}

// Main function to run an account
async function runAccount(privateKey, proxy, referralLink) {
    try {
        console.log(`➤ Running account with proxy: ${proxy}`.cyan);
        console.log(`➤ Starting process for account with proxy: ${proxy}`.cyan);

        const { wallet, signature } = await connectWallet(privateKey);
        console.log(`✔ Wallet connected: ${wallet.address}`.green);

        const token = await loginOrRegister(wallet.address, signature, referralLink);
        console.log(`✔ Login/Register successful for ${wallet.address}`.green);
        console.log(`   Token: ${token}`.dim);

        const tasks = await getAllTasks(token);
        console.log(`✔ Found ${tasks.length} tasks for ${wallet.address}`.green);

        console.log(`✔ Process completed for ${wallet.address}`.green);
        console.log(`➤ Finished running account, waiting before moving to the next account...`.yellow);
    } catch (error) {
        console.error(`✖ Error for ${privateKey}:`.red, error.response ? error.response.data : error.message);
    }
}

// Infinite loop: each iteration creates a new account using a new private key,
// while reusing the proxies in order.
(async () => {
    while (true) {
        for (let i = 0; i < proxies.length; i++) {
            console.log(`============================================================`.yellow);
            const newPrivateKey = generateRandomPrivateKey(); // Generate a new private key for each account
            await runAccount(newPrivateKey, proxies[i], referralLink);
            await delay(10000); // 10-second delay before running the next account
        }
        console.log('✔ All accounts have been processed!'.green);
        console.log('➤ Running accounts again with the same proxies...'.yellow);
    }
})();
