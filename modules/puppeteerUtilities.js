const fs = require("fs");
const puppeteer = require("puppeteer");
const { v4 } = require("uuid");
const getFileName = order => `N${order?.invoice_number || ""}-${order?.order_uuid || ""}.pdf`;

let BROWSER_INSTANCE = null;
let BROWSER_PAGE = null;
let BROWSER_CLOSE_TIMER = null;

const generatePDFs = async data => {
	try {
		if (!data?.length) return console.log("PDF GENERATION TERMINATED. NO PARAMS PROVIDED.", data?.length);
		clearTimeout(BROWSER_CLOSE_TIMER);
		if (!BROWSER_INSTANCE?.isConnected()) {
			console.green("LAUNCING BROWSER INSTANCE. CONNECTION STATE: " + +BROWSER_INSTANCE?.isConnected());
			BROWSER_INSTANCE = await puppeteer.launch({ args: ["--no-sandbox"] });
			BROWSER_PAGE = await BROWSER_INSTANCE.newPage();
			BROWSER_INSTANCE.on("disconnected", () => {
				console.cyan("BROWSER INSTANCE CLOSED. CONNECTION STATE: " + +BROWSER_INSTANCE?.isConnected());
				BROWSER_INSTANCE.removeAllListeners();
			});
		}
		for (const { filename, order_id } of data) {
			if (!BROWSER_INSTANCE?.isConnected()) {
				console.red("PROCESS FAILED! CONNECTION STATE: " + +BROWSER_INSTANCE?.isConnected());
				continue;
			}
			const filepath = `uploads/${filename}`;

			process_id = `PROCESS ID: ${v4()?.slice(0, 8)}`;
			console._time(process_id);

			const website_url = "https://btgondia.com/pdf/" + order_id;
			await BROWSER_PAGE.goto(website_url, { waitUntil: "networkidle0" });
			await BROWSER_PAGE.emulateMediaType("screen");
			await BROWSER_PAGE.pdf({
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

		BROWSER_CLOSE_TIMER = setTimeout(async () => {
			try {
				if (!BROWSER_INSTANCE?.isConnected()) return;
				console.yellow("TERMINATING INSTANCE. CONNECTION STATE: " + +BROWSER_INSTANCE?.isConnected());
				await BROWSER_PAGE.close();
				await BROWSER_INSTANCE.close();
				BROWSER_CLOSE_TIMER = null;
			} catch (error) {
				console.red("ERROR IN CLOSING BROWSER INSTANCE: " + error.message);
				console.log(error);
			}
		}, 15000);
	} catch (err) {
		console.red("ERROR IN PDF GENERATION. ERROR: " + err.message);
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

		if (_data) await generatePDFs(_data);
	} catch (error) {
		console.red("ERROR IN PDFs CHECKING; ERROR: " + error.message);
		console.log(error);
	}
};

module.exports = { generatePDFs, checkPDFs, getFileName };
