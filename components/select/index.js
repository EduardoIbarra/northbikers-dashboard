export const Select = (
    {
        inline = false,
        label = '',
        placeholder = '',
        items = [],
        size = 'w-full',
        hint = null,
        onChange,
        showEmpty = false,
        selected
    }) => (
    <div className={`form-element  ${inline ? 'form-element-inline' : ''} ${size}`}>
        {label && <div className="form-label">{label}</div>}
        <select className="form-select rounded " onChange={(event) => {
            onChange(items.find((i) => i.id == event.target.value))
        }}>
            {placeholder && (
                <option disabled selected={showEmpty}>{placeholder}</option>
            )}
            {items.map((i) => {
                return (
                    <option
                        key={i.id}
                        value={i.id}
                        selected={selected === i.id}
                    >{i.title}</option>
                )
            })}
        </select>
        {hint && <div className="form-hint">{hint}</div>}
    </div>
)


export default Select;
