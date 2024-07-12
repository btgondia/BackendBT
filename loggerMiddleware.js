function loggerMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`Path: ${req.path}, Method: ${req.method}, Duration: ${duration}ms`);
    });

    next();
}

module.exports = loggerMiddleware;
