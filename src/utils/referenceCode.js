// Generates a unique 7-character Household Reference Code (e.g., "HC-8392")
export const generateReferenceCode = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `HC-${randomDigits}`;
};
