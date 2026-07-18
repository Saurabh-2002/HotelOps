export function validateId(idType: string, idNumber: string): { isValid: boolean; error: string; hint: string } {
  if (!idNumber) {
    return { isValid: false, error: 'ID Number is required', hint: '' };
  }

  // Remove spaces for validation where appropriate
  const cleanNumber = idNumber.replace(/\s+/g, '');

  switch (idType) {
    case 'Aadhaar':
      if (!/^\d{12}$/.test(cleanNumber)) {
        return { isValid: false, error: 'Aadhaar must be exactly 12 digits', hint: 'Format: 1234 5678 9012' };
      }
      if (cleanNumber.startsWith('0') || cleanNumber.startsWith('1')) {
        return { isValid: false, error: 'Aadhaar cannot start with 0 or 1', hint: 'Format: 1234 5678 9012' };
      }
      return { isValid: true, error: '', hint: 'Format: 1234 5678 9012' };

    case 'PAN':
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(cleanNumber)) {
        return { isValid: false, error: 'Invalid PAN format', hint: 'Format: ABCDE1234F' };
      }
      return { isValid: true, error: '', hint: 'Format: ABCDE1234F' };

    case 'Passport':
      if (!/^[A-Z][0-9]{7}$/i.test(cleanNumber)) {
        return { isValid: false, error: 'Invalid Passport format', hint: 'Format: A1234567' };
      }
      return { isValid: true, error: '', hint: 'Format: A1234567' };

    case 'Driving License':
      // Basic DL validation: 2 letters, optional hyphen, followed by digits (up to 15)
      if (!/^[A-Z]{2}-?\d{8,15}$/i.test(cleanNumber)) {
        return { isValid: false, error: 'Invalid Driving License format', hint: 'Format: DL-1420110012345' };
      }
      return { isValid: true, error: '', hint: 'Format: DL-1420110012345' };

    default:
      return { isValid: true, error: '', hint: '' };
  }
}
