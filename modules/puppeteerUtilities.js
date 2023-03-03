const fs = require("fs");
const puppeteer = require("puppeteer");
const getFileName = order => `N${order?.invoice_number || ""}-${order?.order_uuid || ""}.pdf`;
let BROWSER = {
	INSTANCE: null,
	PAGE: null,
	STATE: null,
};
let browser_close_timer;

const generatePDFs = async data => {
	try {
		clearTimeout(browser_close_timer);
		if (BROWSER.STATE !== 1) {
			console.log("LAUNCING BROWSER INSTANCE; CURRENT STATE:", BROWSER.STATE);
			BROWSER.INSTANCE = await puppeteer.launch({ args: ["--no-sandbox"] });
			BROWSER.PAGE = await BROWSER.INSTANCE.newPage();
			BROWSER.STATE = 1;
			BROWSER.INSTANCE.on("disconnected", () => {
				BROWSER.STATE = 0;
			});
		}
		for (const { filename, order_id } of data) {
			if (BROWSER.STATE !== 1) {
				console.log("BROWSER.STATE:", BROWSER.STATE);
				continue;
			}
			const filepath = `uploads/${filename}`;
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
			try {
				if (BROWSER.STATE !== 1) return;
				console.log("TERMINATING INSTANCE, CURRENT STATE:", BROWSER.STATE);
				await BROWSER.PAGE.close();
				await BROWSER.INSTANCE.close();
				browser_close_timer = null;
			} catch (error) {
				console.log("ERROR IN CLOSING BROWSER INSTANCE:", error.message);
			}
		}, 5000);
	} catch (err) {
		console.log(err);
	}
};

const checkPDFs = async data => {
	console.log(data.length);
	const _data = data
		?.filter(order => order.order_uuid && !fs.existsSync(`uploads/${getFileName(order)}`))
		?.map(order => ({
			filename: getFileName(order),
			order_id: order.order_uuid,
		}));

	if (!_data) return;
	await generatePDFs(_data);
};

module.exports = { generatePDFs, checkPDFs, getFileName };
