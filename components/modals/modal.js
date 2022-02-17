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
    }) => {
    const modalSize = `max-w-${size}`

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="fixed inset-0 z-10 overflow-y-auto"
                onClose={() => {
                    shouldDismissOnBackdrop ? onClose() : () => {
                    }
                }}
            >
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-30"/>
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
                        <Dialog.Overlay className="fixed inset-0"/>
                    </Transition.Child>

                    <span
                        className="inline-block h-screen align-middle"
                        aria-hidden="true"
                    >
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
                        <div className={`inline-block w-full p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded ${modalSize}`}>
                            <Dialog.Title
                                as="h3"
                                className="text-lg font-medium leading-6 text-gray-900"
                            >
                                {title}
                            </Dialog.Title>
                            {subtitle && (<div className="mt-2">
                                    <p className="text-sm text-gray-500">
                                        {subtitle}
                                    </p>
                                </div>
                            )}

                            <div className="mt-4">
                                {children}

                                {(okButton || cancelButton) && (
                                    <div className="pl-4 py-3 sm:pl-6 sm:flex sm:flex-row-reverse gap-4">
                                        {okButton?.label && okButton?.onClick && (
                                            <button
                                                type="button"
                                                className={`btn btn-default btn-rounded btn-icon  text-white ${okClearButton ? 'bg-blue-400 hover:bg-blue-500' :'bg-blue-500 hover:bg-blue-600'}`}
                                                onClick={okButton.onClick}
                                            >
                                                {okButton.label}
                                            </button>
                                        )}

                                        {cancelButton?.label && cancelButton?.onClick && (
                                            <button
                                                type="button"
                                                className="btn btn-default btn-rounded btn-icon bg-red-500 hover:bg-red-600 text-white"
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
