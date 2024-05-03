/* eslint-disable react/no-unescaped-entities */
"use client";

import { CertificateManager } from "@/helpers/certificate-manager";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useCallback, useRef, useState } from "react";

export type EndpointData = {
  nickname: string;
  hostname: string;
  port: number;
};

export default function CreateProxySideComponent({
  open,
  setOpen,
  onAdd: onAddFinish,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  onAdd: (data: EndpointData) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const onAddButton = useCallback(async () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    setIsGenerating(true);
    const data: EndpointData = {
      nickname: formData.get("nickname") as string,
      hostname: formData.get("hostname") as string,
      port: parseInt(formData.get("port") as string),
    };
    //
    // gen cert
    const certMgr = new CertificateManager();
    const pems = await certMgr.generateCertificate(data.hostname);
    const conf = await certMgr.generateNginxConfigurationFiles(
      data.hostname,
      data.port
    );

    setIsGenerating(false);
    setOpen(false);
    onAddFinish(data);
  }, [onAddFinish, setOpen]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={() => {
          // do nothing
        }}
      >
        {isGenerating && (
          <div className="fixed inset-0 z-10 bg-white bg-opacity-30 backdrop-blur-sm">
            <div className="w-full h-full flex flex-col gap-8 justify-center items-center">
              <div className="w-8 h-8 animate-ping rounded-full bg-green-500"></div>
              <div className="text-xs">
                Generating SSL certificate. It may take a while...
              </div>
            </div>
          </div>
        )}
        <div className="fixed inset-0 overflow-hidden bg-gray-950 bg-opacity-50 backdrop-blur-sm">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300 sm:duration-500"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300 sm:duration-500"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-gray-950 py-6 shadow-xl">
                    <div className="px-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-base font-semibold leading-6 text-white">
                          Create Proxy
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            onClick={() => setOpen(false)}
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="relative mt-6 flex-1 px-4 sm:px-6">
                      <form
                        className="flex flex-col gap-8 w-full max-w-sm"
                        ref={formRef}
                        onSubmit={(e) => {
                          e.preventDefault();
                          onAddButton();
                        }}
                      >
                        <div className="flex flex-col gap-1">
                          <label className="text-lg font-medium text-gray-300">
                            Nickname for reference
                          </label>
                          <input
                            type="text"
                            name="nickname"
                            required={true}
                            className="p-2 bg-transparent border border-gray-600 caret-gray-600 rounded-md text-gray-100"
                            placeholder="ex) my-server"
                          />
                          <div className="">
                            <span className="text-xs text-gray-400">
                              A nickname for your proxy.
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-lg font-medium text-gray-300">
                            Hostname to use
                          </label>
                          <input
                            type="text"
                            name="hostname"
                            required={true}
                            className="p-2 bg-transparent border border-gray-600 caret-gray-600 rounded-md text-gray-100"
                            placeholder="ex) my.local.host.com"
                          />
                          <div className="">
                            <span className="text-xs text-gray-400">
                              The hostname that you want to create. (e.g.
                              my.localhost.com)
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-lg font-medium text-gray-300">
                            Port to proxy
                          </label>
                          <input
                            type="number"
                            name="port"
                            min={1}
                            max={65535}
                            required={true}
                            className="p-2 bg-transparent border border-gray-600 caret-gray-600 rounded-md text-gray-100"
                            placeholder="3000"
                          />
                          <span className="text-sm text-gray-400">
                            The port number of your current application.
                          </span>
                        </div>
                        <div className="bg-gray-300 w-full text-gray-900 text-sm p-4 rounded-md">
                          <p className="font-bold">Please read! 📖</p>
                          <ul>
                            <li>
                              * An SSL certificate will be generated and saved
                              to a local config folder automatically.
                            </li>
                            <li className="">
                              * You will be asked for{" "}
                              <span className="text-red-600 font-medium">
                                password/fingerprint
                              </span>{" "}
                              to allow the certificate installation and trust.
                            </li>
                            <li>
                              * You will be asked to{" "}
                              <span className="text-red-600 font-medium">
                                enter your computer's password
                              </span>{" "}
                              to create a record on the /etc/hosts file.
                            </li>
                          </ul>
                        </div>
                        <div className="">
                          <button
                            type="submit"
                            className="block rounded-md bg-indigo-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                          >
                            Create
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
