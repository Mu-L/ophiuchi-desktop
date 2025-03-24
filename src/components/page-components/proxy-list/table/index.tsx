import { AddProxyDialog } from "@/components/page-components/add-proxy";
import PrepareButtons from "@/components/page-components/certificate-dialogs/cert-buttons";
import { AddProxyToGroupDialog } from "@/components/page-components/proxy-list/add-new/proxy-to-group";
import { DeleteProxyDialog } from "@/components/page-components/proxy-list/delete/delete-proxy-dialog";
import { EditGroupDialog } from "@/components/page-components/proxy-list/edit/group";
import { Button } from "@/components/ui/button";
import Code from "@/components/ui/code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import proxyListStore from "@/stores/proxy-list";
import { Label } from "@radix-ui/react-label";
import { useCallback, useEffect, useState } from "react";
import DockerControl from "../../docker-control";

export default function ProxyListTable() {
  const {
    load,
    proxyList,
    selectedGroup,
    removeProxyFromList,
    removeProxyFromGroup,
    deleteGroup,
  } = proxyListStore();

  const [loaded, setLoaded] = useState(false);

  const prepareConfigPage = useCallback(async () => {
    console.log("prepareConfigPage");
    load();
    setLoaded(true);
  }, [load]);

  useEffect(() => {
    prepareConfigPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tableCaption() {
    if (selectedGroup?.isNoGroup) {
      return (
        <>
          All of your proxies. <br />
          Add these proxies to the group to start container for this group!
        </>
      );
    }

    if (proxyList.length === 0) {
      return (
        <div className="text-yellow-500 dark:text-yellow-300">
          Add existing proxy in this group to start container for this group!
        </div>
      );
    } else {
      return (
        <>
          List of proxies in this group. <br />
          Press start Container to start the docker webserver.
        </>
      );
    }
  }

  return (
    <>
      <div className="px-6 border border-zinc-700 rounded-md py-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <Label className="font-medium leading-6  ">
              {selectedGroup?.isNoGroup ? (
                "Proxy List"
              ) : (
                <div className="flex gap-2 items-center">
                  <div>Proxy Group - {selectedGroup?.name}</div>
                  <div className="flex">
                    <EditGroupDialog />
                  </div>
                </div>
              )}
            </Label>
          </div>

          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <div className="flex gap-2 items-center">
              {selectedGroup?.isNoGroup ? (
                <AddProxyDialog
                  onDone={() => {
                    //
                  }}
                />
              ) : (
                <>
                  <DockerControl />
                  <AddProxyToGroupDialog
                    onDone={() => {
                      //
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <Table>
                <TableCaption className="text-xs">
                  {tableCaption()}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[400px]">Hostname</TableHead>
                    <TableHead>Application Port</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proxyList.map((proxyItem) => {
                    return (
                      <TableRow key={proxyItem.hostname}>
                        <TableCell className="font-medium">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                className="p-2 underline cursor-pointer text-sm sm:pl-0"
                                href={`https://${proxyItem.hostname}`}
                                target="_blank"
                              >
                                {proxyItem.hostname}
                              </a>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>Click to open on browser.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{proxyItem.port}</TableCell>

                        {/* <TableCell></TableCell> */}

                        <TableCell className="flex gap-4 justify-end items-center">
                          {/* <p
                          onClick={() => {
                            openCert(proxyItem);
                          }}
                          className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          Locate Cert
                        </p> */}
                          <PrepareButtons item={proxyItem} />
                          {selectedGroup?.isNoGroup ? (
                            <DeleteProxyDialog
                              proxy={proxyItem}
                              onDelete={() => removeProxyFromList(proxyItem)}
                            />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size={"sm"}
                                  variant={"ghost"}
                                  onClick={() => {
                                    if (!selectedGroup) return;
                                    removeProxyFromGroup(
                                      proxyItem,
                                      selectedGroup
                                    );
                                  }}
                                >
                                  Remove from Group
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p>
                                  Remove this proxy from the group{" "}
                                  <Code>{selectedGroup?.name}</Code>
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
      {selectedGroup?.isNoGroup ? null : (
        <div className="text-right pt-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant={"ghost"} size="sm">
                <span className="text-muted-foreground">Delete Group</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="">
              <DialogHeader>
                <DialogTitle>Delete Group</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this group?
                </DialogDescription>
              </DialogHeader>
              <Code>{selectedGroup?.name}</Code>
              <DialogFooter>
                <Button
                  variant={"destructive"}
                  onClick={() => {
                    if (selectedGroup) {
                      deleteGroup(selectedGroup?.id);
                    }
                  }}
                >
                  Yes, delete.
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}
