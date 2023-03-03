const fs = require("fs");
const puppeteer = require("puppeteer");
const getFileName = order => `N${order?.invoice_number || ""}-${order?.order_uuid || ""}.pdf`;
let BROWSER = {
	INSTANCE: null,
	PAGE: null,
};
let browser_close_timer;

const generatePDFs = async data => {
	try {
		if (browser_close_timer) {
			console.log("CANCELLING TIMER:", browser_close_timer);
			clearTimeout(browser_close_timer);
		}
		if (!BROWSER?.INSTANCE?.on) {
			console.log("LAUNCING BROWSER INSTANCE:", BROWSER?.INSTANCE);
			BROWSER.INSTANCE = await puppeteer.launch({ args: ["--no-sandbox"] });
			BROWSER.PAGE = await BROWSER.INSTANCE.newPage();
		}
		for (const { filename, order_id } of data) {
			const filepath = `./uploads/${filename}`;
			console.time("PROCESS");
			const website_url = "https://btgondia.com/pdf/" + order_id;
			await BROWSER.PAGE.goto(website_url, { waitUntil: "networkidle0" });
			await BROWSER.PAGE.emulateMediaType("screen");
			await BROWSER.PAGE.pdf({
				path: filepath,
				margin: {
					top: "100px",
					right: "50px",
					bottom: "100px",
					left: "50px",
				},
				printBackground: true,
				format: "A4",
			});
			console.timeEnd("PROCESS");
		}

		browser_close_timer = setTimeout(async () => {
			console.log("TERMINATING INSTANCES", { BROWSER });
			await BROWSER.PAGE.close();
			await BROWSER.INSTANCE.close();
			browser_close_timer = null;
		}, 5000);
	} catch (err) {
		console.log(err);
	}
};

const checkPDFs = async data => {
	console.log(data.length);
	const _data = data
		?.filter(order => order.order_uuid && !fs.existsSync(`./uploads/${getFileName(order)}`))
		?.map(order => ({
			filename: getFileName(order),
			order_id: order.order_uuid,
		}));

	if (!_data) return;
	await generatePDFs(_data);
};

module.exports = { generatePDFs, checkPDFs, getFileName };
