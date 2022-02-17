export const TextInput = (
    {
        inline = false,
        label = '',
        name = 'input-text',
        disabled = false,
        type = 'text',
        value = '',
        onChange = () => {
        },
        placeholder = '',
        hint
    }) => (
    <div className={`form-element w-full ${inline ? 'form-element-inline' : ''}`}>
        <div className="form-label">{label}</div>
        <input
            value={value ?? ''}
            name={name}
            disabled={disabled}
            type={type}
            className="form-input rounded"
            placeholder={placeholder}
            onChange={(e) => {
                onChange(e.target.value)
            }}
        />
        {hint && <div className="form-hint">{hint}</div>}
    </div>
)

export default TextInput;
