const sendErrorResponse = (res, error) => {
    console.log(error);
    try {
        res.status(error.status ? error.status : 500).json({
            code: error.status ? error.status.toString() : "500",
            message: error.message,
            timestamp: new Date().toISOString()
        });
    } catch (ignore) {
        console.log(ignore);
    }
};

module.exports = {
    sendErrorResponse
};