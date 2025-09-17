// Function to render the phone input field
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const renderPhoneInput = (value, onChange) => (
    <PhoneInput
    country={'et'}
    value={value}
    onChange={onChange}
    inputStyle={{ width: '100%' }}
    />
)

export default renderPhoneInput;