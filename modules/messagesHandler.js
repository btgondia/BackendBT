const fs = require("fs")
const Notification_logs = require("../Models/notification_log")
const { getFileName, generatePDFs } = require("./puppeteerUtilities")
const { messageEnque } = require("../queues/messageQueue")
const filterContacts = coll => coll?.filter(i => i?.mobile && i?.lable?.find(a => a.type === "wa" && +a.varification))

const contactsProcessHandler = async (contacts, messagesCollection, counterData, value, options = {}) => {
	for (let contact of contacts) {
		if (!contact?.mobile) continue

		let messages = []
		if (`${contact.mobile}`?.length === 10) contact.mobile = `91${contact.mobile}`

		if (messagesCollection)
			for (let messageobj of messagesCollection) {
				let message = ""
				if (messageobj?.type === "text") {
					const amt_value = value?.order_grandtotal || value?.amount || value?.amt || ""
					message = messageobj.text
						?.replace(/{counter_title}/g, counterData?.counter_title || "")
						?.replace(/{short_link}/g, "https://btgondia.com/counter/" + counterData?.short_link || "")
						?.replace(/{invoice_number}/g, value?.invoice_number || "")
						?.replace(/{amount}/g, amt_value)
					// * {details} is handled on the initial route level.

					const doc = { number: `${contact.mobile}`, type: "text", message }
					messages.push(doc)
					await messageEnque(doc)
				} else if (fs.existsSync("./uploads/" + (messageobj.uuid || "") + ".png")) {
					const doc = {
						number: `${contact.mobile}`,
						type: "media",
						filename: messageobj.uuid + ".png",
						message: messageobj?.caption || "",
					}
					messages.push(doc)
					await messageEnque(doc)
				}
			}

		if (
			(options.notify || options?.orderPDF) &&
			value?.order_uuid &&
			fs.existsSync(`./uploads/${getFileName(value)}`)
		) {
			const doc = {
				number: `${contact.mobile}`,
				type: "media",
				filename: getFileName(value),
				message: value.invoice_number || "",
			}

			if (options?.orderPDF) doc.message = value.caption || ""
			else doc.message = value.invoice_number || ""

			console.log("sending message:", doc)
			messages.push(doc)
			await messageEnque(doc)
		}

		if (value?.notifiacation_uuid)
			await Notification_logs.create({
				contact: contact.mobile,
				notification_uuid: value?.notifiacation_uuid,
				messages: messages?.filter(i => i.message)?.map(i => ({ text: i.message })),
				invoice_number: value?.invoice_number,
				created_at: new Date().getTime(),
			})
	}
}

const sendMessages = async ({ counterData = {}, value = {}, WhatsappNotification }) => {
	try {
		const filename = getFileName(value)
		const filepath = `uploads/${filename}`

		if (
			(!WhatsappNotification || (WhatsappNotification && WhatsappNotification?.checkbox)) &&
			value?.order_uuid &&
			!fs.existsSync(filepath)
		) {
			await generatePDFs([{ filename, order_id: value.order_uuid }])
		}

		if (WhatsappNotification?.message) {
			await contactsProcessHandler(
				filterContacts(counterData?.mobile),
				WhatsappNotification?.message,
				counterData,
				value,
				{ notify: WhatsappNotification?.checkbox }
			)
		}
	} catch (err) {
		console.log(err)
	}
}

const compaignShooter = async ({ counterData = {}, value = {}, options }) => {
	const contacts = filterContacts(counterData?.mobile || [])
		.concat(value?.mobile)
		.concat(value?.additional_numbers?.map(i => ({ mobile: i })))
	await contactsProcessHandler(contacts, value.message, counterData, value, options)
}

module.exports = { sendMessages, compaignShooter }
