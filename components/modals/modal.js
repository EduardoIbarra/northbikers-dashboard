import {Dialog, Transition} from "@headlessui/react";
import {Fragment} from "react";

const Modal = (
    {
        shouldDismissOnBackdrop = true,
        isOpen,
        onClose,
        title,
        subtitle,
        children,
        size = 'md',
        okButton,
        cancelButton,
        okClearButton = false,
        theme = 'dark' // Added theme prop
    }) => {
    const modalSize = `max-w-${size}`

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="fixed inset-0 z-50 overflow-y-auto"
                onClose={() => shouldDismissOnBackdrop && onClose()}
            >
                <div className="min-h-screen px-4 text-center">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 bg-black backdrop-blur-sm" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span
                        className="inline-block h-screen align-middle"
                        aria-hidden="true"
                    >
                        &#8203;
                    </span>

                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <div 
                            style={{ backgroundColor: '#161616', opacity: 1 }}
                            data-background={theme}
                            className={`inline-block w-full p-10 my-8 overflow-hidden text-left align-middle transition-all transform shadow-[0_35px_60px_-15px_rgba(0,0,0,1)] rounded-[3rem] ${theme === 'dark' ? 'border border-neutral-800 text-white' : 'bg-white text-gray-900'} ${modalSize}`}
                        >
                            <div className="mb-10">
                                <Dialog.Title
                                    as="h3"
                                    className={`text-4xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                                >
                                    {title}
                                </Dialog.Title>
                                {subtitle && (
                                    <div className="mt-3">
                                        <p className={`text-base font-medium ${theme === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                                            {subtitle}
                                        </p>
                                    </div>
                                )}
                            </div>
 
                            <div className="relative z-10">
                                {children}
 
                                {(okButton || cancelButton) && (
                                    <div className="mt-12 pt-10 border-t border-neutral-800 flex flex-row-reverse gap-6">
                                        {okButton?.label && okButton?.onClick && (
                                            <button
                                                disabled={okButton?.disabled}
                                                type="button"
                                                className={`px-12 py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-xl ${
                                                    okButton?.disabled 
                                                        ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed' 
                                                        : 'bg-yellow-500 hover:bg-yellow-400 text-black hover:shadow-yellow-500 hover:scale-[1.02] active:scale-[0.98]'
                                                }`}
                                                onClick={okButton.onClick}
                                            >
                                                {okButton.label}
                                            </button>
                                        )}
 
                                        {cancelButton?.label && cancelButton?.onClick && (
                                            <button
                                                type="button"
                                                className="px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all duration-300"
                                                onClick={cancelButton.onClick}
                                            >
                                                {cancelButton.label}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    )
}

export default Modal
