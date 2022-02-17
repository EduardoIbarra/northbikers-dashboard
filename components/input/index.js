export const TextInput = (
    {
        inline = false,
        label = '',
        name = 'input-text',
        type = 'text',
        onChange = () => {
        },
        placeholder = '',
        hint
    }) => (
    <div className={`form-element w-full ${inline ? 'form-element-inline' : ''}`}>
        <div className="form-label">{label}</div>
        <input
            name={name}
            type={type}
            className="form-input rounded"
            placeholder={placeholder}
            onChange={(e) => {
                onChange(e.target.value)
            }}
        />
        {hint && <div className="form-hint">hint</div>}
    </div>
)

export default TextInput;
