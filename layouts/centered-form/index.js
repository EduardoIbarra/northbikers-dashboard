
const Index = ({title, subtitle, children}) => {
  return (
    <div className="flex flex-col bg-neutral-900 border border-neutral-800 p-12 w-full max-w-lg rounded-[3rem] shadow-2xl backdrop-blur-md">
      <div className="flex flex-col w-full mb-10 text-center">
        <div className="text-yellow-500 text-xs font-bold uppercase tracking-widest mb-2">{title}</div>
        <div className="text-3xl font-extrabold text-white">{subtitle}</div>
      </div>
      {children}
    </div>
  )
}

export default Index
