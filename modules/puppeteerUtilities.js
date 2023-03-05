const fs = require("fs");
const puppeteer = require("puppeteer");
const { v4 } = require("uuid");
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
			console.green("LAUNCING BROWSER INSTANCE; CURRENT STATE: " + BROWSER.STATE);
			BROWSER.STATE = 1;
			BROWSER.INSTANCE = await puppeteer.launch({ args: ["--no-sandbox"] });
			BROWSER.PAGE = await BROWSER.INSTANCE.newPage();
			BROWSER.INSTANCE.on("disconnected", () => {
				BROWSER.STATE = 0;
				console.yellow("BROWSER INSTANCE CLOSED. CURRENT STATE: " + BROWSER.STATE);
			});
		}
		for (const { filename, order_id } of data) {
			if (BROWSER.STATE !== 1) {
				console.red("PROCESS FAILED! CURRENT STATE: " + BROWSER.STATE);
				continue;
			}
			const filepath = `uploads/${filename}`;

			process_id = `PROCESS ID: ${v4()?.slice(0, 8)}`;
			console._time(process_id);

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
			console._timeEnd(process_id);
		}

		browser_close_timer = setTimeout(async () => {
			try {
				if (BROWSER.STATE !== 1) return;
				console.yellow("TERMINATING INSTANCE, CURRENT STATE:" + BROWSER.STATE);
				await BROWSER.PAGE.close();
				await BROWSER.INSTANCE.close();
				browser_close_timer = null;
			} catch (error) {
				console.red("ERROR IN CLOSING BROWSER INSTANCE: " + error.message);
				console.log(error);
			}
		}, 15000);
	} catch (err) {
		console.red("ERROR IN PDF GENERATION; ERROR: " + err.message);
		console.log(err);
	}
};

const checkPDFs = async data => {
	try {
		console.log(data.length);
		const _data = data
			?.filter(order => order.order_uuid && !fs.existsSync(`uploads/${getFileName(order)}`))
			?.map(order => ({
				filename: getFileName(order),
				order_id: order.order_uuid,
			}));

		if (!_data) return;
		await generatePDFs(_data);
	} catch (error) {
		console.red("ERROR IN PDFs CHECKING; ERROR: " + error.message);
		console.log(error);
	}
};

module.exports = { generatePDFs, checkPDFs, getFileName };
