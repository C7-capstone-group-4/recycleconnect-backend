/**
 * Validates required fields in request body
 * @param {Object} body - req.body
 * @param {Array<String>} requiredFields - Array of required key names
 * @returns {Array<String>} Array of missing field names
 */
export const validateRequiredFields = (body, requiredFields) => {
    return requiredFields.filter(
        (filed) => body[field] === undefined || body[field] === null || body[field].toString().trim() === ''
    );
};
