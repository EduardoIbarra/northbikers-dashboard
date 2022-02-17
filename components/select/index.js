export const Select = (
    {
        inline = false,
        label = '',
        placeholder = '',
        items = [],
        hint = null,
        onChange = null,

    }) => (
    <div className={`form-element  w-full ${inline ? 'form-element-inline' : ''}`}>
        <div className="form-label">{label}</div>
        <select className="form-select rounded ">
            {placeholder && (
                <option disabled>{placeholder}</option>
            )}
            {items.map((i) => {
                return (
                    <option
                        key={i.id}
                        value={i.id}
                        onSelect={() => {
                            onChange(i)
                        }}
                    >{i.title}</option>
                )
            })}
        </select>
        {hint && <div className="form-hint">{hint}</div>}
    </div>
)


export default Select;
