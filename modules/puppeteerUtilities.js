const fs = require("fs")
const puppeteer = require("puppeteer")
const { Worker } = require("bullmq")
const { processEnque, processDeque } = require("../queues/pdfQueue")
const { redisConnection } = require("../config/redis")

let BROWSER_INSTANCE = null
let BROWSER_PAGE = null
let BROWSER_CLOSE_TIMER = null
let BROWSER_INITIALIZING_INPROGRESS = null

const getFileName = order => `N${order?.invoice_number || ""}-${order?.order_uuid || ""}.pdf`

const verifyInstance = async () => {
	let attempts = 60
	if (!BROWSER_INSTANCE?.isConnected() || !BROWSER_PAGE?.goto || BROWSER_INITIALIZING_INPROGRESS)
		await new Promise((resolve, reject) => {
			let id = setInterval(() => {
				if (!BROWSER_INSTANCE?.isConnected() || !BROWSER_PAGE?.goto) {
					if (!--attempts) {
						clearInterval(id)
						reject(Error("Could not start instance."))
					}
					return
				}
				console.green(`BROWSER INITIALIZED.`)
				clearInterval(id)
				resolve()
			}, 1000)
		})
}

const generatePDFs = async data => {
	try {
		if (process.env?.NODE_ENV === "development") return

		if (!data?.length)
			return console.gray("PDF GENERATION TERMINATED. NO PARAMS PROVIDED." + data?.length)
		else if (BROWSER_INITIALIZING_INPROGRESS) {
			console.yellow(`BROWSER INITIALIZING INPROGRESS...`)
			await verifyInstance()
		} else if (!BROWSER_INSTANCE?.isConnected()) {
			BROWSER_INITIALIZING_INPROGRESS = true
			console.green("LAUNCING BROWSER INSTANCE. CONNECTION STATE: " + +BROWSER_INSTANCE?.isConnected())
			BROWSER_INSTANCE = await puppeteer.launch({ args: ["--no-sandbox"] })
			BROWSER_PAGE = await BROWSER_INSTANCE.newPage()
			BROWSER_INITIALIZING_INPROGRESS = false
			BROWSER_INSTANCE.on("disconnected", () => {
				console.cyan("BROWSER INSTANCE CLOSED. CONNECTION STATE: " + +BROWSER_INSTANCE?.isConnected())
				BROWSER_INSTANCE.removeAllListeners()
			})
		}

		if (!BROWSER_INSTANCE?.isConnected())
			return console.red("PROCESS FAILED! CONNECTION STATE: " + +BROWSER_INSTANCE?.isConnected())

		await processEnque(data)
	} catch (err) {
		console.red("ERROR IN PDF GENERATION. ERROR: " + err.message)
		console.log(err)
	}
}

const checkPDFs = async data => {
	try {
		console.log(data.length)
		const _data = data
			?.filter(order => order.order_uuid && !fs.existsSync(`uploads/${getFileName(order)}`))
			?.map(order => ({
				filename: getFileName(order),
				order_id: order.order_uuid,
			}))

		if (_data) await generatePDFs(_data)
	} catch (error) {
		console.red("ERROR IN PDFs CHECKING; ERROR: " + error.message)
		console.log(error)
	}
}

if (process.env?.NODE_ENV !== "development")
	new Worker(
		"PDFGeneration",
		async job => {
			try {
				clearTimeout(BROWSER_CLOSE_TIMER)
				await verifyInstance()

				const { filename, order_id } = job.data
				const filepath = `uploads/${filename}`

				if (!fs.existsSync(filepath)) {
					let init_time = Date.now()

					const website_url = "https://btgondia.com/pdf/" + order_id
					await BROWSER_PAGE.goto(website_url, { waitUntil: "networkidle0" })
					await BROWSER_PAGE.emulateMediaType("screen")
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
					})
					processDeque(job.id)
					console.yellow(`JOB: ${job.id} TOOK ${Date.now() - init_time}ms`)
				} else {
					console.magenta(`SKIPPED JOB: ${job.id}. Document: ${filepath} already present.`)
				}

				BROWSER_CLOSE_TIMER = setTimeout(async () => {
					try {
						if (!BROWSER_INSTANCE?.isConnected()) return
						console.yellow(
							"TERMINATING INSTANCE. CONNECTION STATE: " + +BROWSER_INSTANCE?.isConnected()
						)
						await BROWSER_PAGE.close()
						await BROWSER_INSTANCE.close()
						BROWSER_CLOSE_TIMER = null
					} catch (error) {
						console.red("ERROR IN CLOSING BROWSER INSTANCE: " + error.message)
						console.log(error)
					}
				}, 15000)
			} catch (error) {
				console.log("ERROR IN PROCESSING:", {
					message: error?.message,
					data: job.data,
					error,
				})
			}
		},
		{
			connection: redisConnection,
		}
	)

module.exports = { generatePDFs, checkPDFs, getFileName }
