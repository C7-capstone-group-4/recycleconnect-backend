/**
 * Validates required fields in request body
 * @param {Object} body - req.body
 * @param {Array<String>} requiredFields - Array of required key names
 * @returns {Array<String>} Array of missing field names
 */
export const validateRequiredFields = (body, requiredFields) => {
    return requiredFields.filter(
        (field) => body[field] === undefined || body[field] === null || body[field].toString().trim() === ''
    );
};

/**
 * Validates phone numbers:
 * - Nigerian local format (11 digits with 070, 080, 081, 090, 091)
 * - Nigerian International: Exactly +234 followed by 10 digits starting with 7, 8, and 9
 * - General International format: Must have country code '+' followed by 10 to 14 digits (e.g. "+12025550123")
 */
export const isValidPhoneNumber = (phone) => {
    if (!phone || typeof phone !== 'string') return false;

    // Remove spaces, hyphens, and parenthesis
    const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');

    // Nigerian local format
    const ngLocalRegex = /^0[789][01]\d{8}$/;
    if (ngLocalRegex.test(cleanPhone)) return true;

    // Nigerian International format
    const ngIntlRegex = /^(\+?234)[789][01]\d{8}$/;
    if (ngIntlRegex.test(cleanPhone)) return true;

    // General E.164 International format
    const generalIntlRegex = /^\+[1-9]\d{10,14}$/;
    return generalIntlRegex.test(cleanPhone);
}
