const sendErrorResponse = (res, error) => {
    try {
        const status = error.status || 500;
        res.status(status).json({
            code: status.toString(),
            message: error.message,
            timestamp: new Date().toISOString()
        });
    } catch (ignore) {
        console.error(ignore);
    }
};

module.exports = {
    sendErrorResponse
};