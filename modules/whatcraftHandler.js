const fs = require("fs");
const FormData = require("form-data");
const axios = require("axios");
const Notification_logs = require("../Models/notification_log");
const { getFileName, generatePDFs } = require("./puppeteerUtilities");
// const whatcraft_ip = "http://localhost:2000";
const whatcraft_ip = "http://3.111.81.7:2000";
const filterContacts = coll => coll?.filter(i => i?.mobile && i?.lable?.find(a => a.type === "wa" && +a.varification));

const callAPI = async ({ file, data }) => {
	return console.log("WHATCRAFT API ACCESS CURRENTLY UNAVAILABLE.");
	// try {
	// 	if (file.length) {
	// 		const form = new FormData();
	// 		form.append("instructions", JSON.stringify(data));
	// 		for (let item of file) form.append("file", fs.createReadStream("uploads/" + (item || "")));
	// 		const result = await axios.post(`${whatcraft_ip}/send`, form, form.getHeaders());
	// 		console.log(result.data, data);
	// 	} else {
	// 		let msgResponse = await axios({
	// 			url: `${whatcraft_ip}/sendMessage`,
	// 			method: "post",
	// 			data,
	// 		});
	// 		console.log(msgResponse.data, data);
	// 	}
	// } catch (error) {
	// 	console.log("ERROR IN WHATCRAFT API REQUEST.");
	// 	console.error(error.message);
	// }
};

const contactsProcessHandler = async (contacts, messagesCollection, counterData, value, options = {}) => {
	const data = [];
	const file = [];

	for (let contact of contacts) {
		let messages = [];

		for (let messageobj of messagesCollection) {
			let message = "";
			if (messageobj?.type === "text") {
				message = messageobj.text
					?.replace(/{counter_title}/g, counterData?.counter_title || "")
					?.replace(/{short_link}/g, "https://btgondia.com/counter/" + counterData?.short_link || "")
					?.replace(/{invoice_number}/g, value?.invoice_number || "")
					?.replace(/{amount}/g, value.order_grandtotal || value?.amount || value?.amt || "");
				messages.push({ text: message });
			} else if (fs.existsSync("uploads/" + (messageobj.uuid || "") + ".png")) {
				file.push(messageobj.uuid + ".png");
				messages.push({
					file: messageobj.uuid + ".png",
					sendAsDocument: false,
					caption: messageobj?.caption || "",
				});
			}
		}

		if (options.notify && value?.order_uuid && fs.existsSync(`uploads/${getFileName(value)}`)) {
			file.push(getFileName(value));
			messages.push({
				file: getFileName(value),
				sendAsDocument: true,
				caption: value.invoice_number || "",
			});
		}

		data.push({ contact: contact.mobile, messages });
		await Notification_logs.create({
			contact: contact.mobile,
			notification_uuid: value.notifiacation_uuid,
			messages,
			invoice_number: value.invoice_number,
			created_at: new Date().getTime(),
		});
	}

	return { data, file };
};

const sendMessages = async ({ counterData = {}, value = {}, WhatsappNotification }) => {
	try {
		let data = [];
		let file = [];

		const filename = getFileName(value);
		const filepath = `uploads/${filename}`;

		if (
			(!WhatsappNotification || (WhatsappNotification && WhatsappNotification?.checkbox)) &&
			value?.order_uuid &&
			!fs.existsSync(filepath)
		) {
			await generatePDFs([{ filename, order_id: value.order_uuid }]);
		}

		const response = await contactsProcessHandler(
			filterContacts(counterData?.mobile),
			WhatsappNotification.message,
			counterData,
			value,
			{ notify: WhatsappNotification?.checkbox }
		);

		data = data.concat(response.data);
		file = file.concat(response.file);

		await callAPI({ file, data });
	} catch (err) {
		console.log(err);
	}
};

const compaignShooter = async ({ counterData = {}, value = {} }) => {
	const contacts = filterContacts(counterData?.mobile || []).concat(value?.mobile);
	const response = await contactsProcessHandler(contacts, value.message, counterData, value);
	await callAPI(response);
};

module.exports = { sendMessages, compaignShooter };
