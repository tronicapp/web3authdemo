import "./App.css";
import {
    useEffect,
    useState,
} from "react";
import { Web3AuthCore } from "@web3auth/core";
import { CoinbaseAdapter } from "@web3auth/coinbase-adapter";
import { MetamaskAdapter } from "@web3auth/metamask-adapter";
import {
    CHAIN_NAMESPACES,
    ADAPTER_EVENTS,
} from "@web3auth/base";
import {
    CHAIN_BLOCK_EXPLORER,
    CHAIN_DISPLAY_NAME,
    CHAIN_ID,
    CHAIN_RPC_TARGET,
    CHAIN_TICKER,
    CHAIN_TICKER_NAME,
    WEB_3_AUTH_CLIENT_ID,
} from "./consts";

let chainOptions = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x4",
    rpcTarget: "https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
    displayName: "rinkeby",
    blockExplorer: "https://rinkeby.etherscan.io/",
    ticker: "ETH",
    tickerName: "Ethereum",
};

const coinbaseAdapter = new CoinbaseAdapter({
    adapterSettings: { appName: "Drop Engine Test App" },
    chainConfig: chainOptions,
});
const metamaskAdapter = new MetamaskAdapter({
    chainConfig: chainOptions,
});

function App() {
    const [web3auth, setWeb3auth] = useState(null);
    const [provider, setProvider] = useState(null);

    function subscribeAuthEvents(web3auth) {
        web3auth.on(ADAPTER_EVENTS.CONNECTED, async (data) => {
            console.log("Yeah!, you are successfully logged in", data, web3auth.provider);
            setProvider(web3auth.provider)
        });

        web3auth.on(ADAPTER_EVENTS.CONNECTING, () => {
            console.log("connecting");
        });

        web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
            console.log("disconnected");
        });

        web3auth.on(ADAPTER_EVENTS.ERRORED, (error) => {
            console.log(
                "some error or user have cancelled login request",
                error
            );
        });
    }

    const init = async () => {
        try {
            const ethChainConfig = {
                chainNamespace: CHAIN_NAMESPACES.EIP155,
                displayName: CHAIN_DISPLAY_NAME,
                blockExplorer: CHAIN_BLOCK_EXPLORER,
                chainId: CHAIN_ID,
                rpcTarget: CHAIN_RPC_TARGET,
                ticker: CHAIN_TICKER,
                tickerName: CHAIN_TICKER_NAME,
            };
            const options = {
                chainConfig: ethChainConfig,
                authMode: "DAPP",
                clientId: WEB_3_AUTH_CLIENT_ID,
            };
            const wA = new Web3AuthCore(options);

            wA.configureAdapter(coinbaseAdapter);
            wA.configureAdapter(metamaskAdapter);
            subscribeAuthEvents(wA);


            await wA.init();
            setWeb3auth(wA);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
      console.log('initializing')
      init()
    }, [])

    const login = async (wallet) => {
        if (web3auth?.status !== "ready") {
            await init();
        }

        if (!web3auth) {
            console.log("web3auth not initialized");
            return;
        }

        let adapterName;

        switch (wallet) {
            case "metamask":
                adapterName = metamaskAdapter.name;
                break;
            case "coinbase":
                adapterName = coinbaseAdapter.name;
                break;
        }

        await web3auth.connectTo(adapterName);
    };

    const logout = async () => {
        if (!web3auth) {
            console.log("web3auth not initialized yet");
            return;
        }
        await web3auth.logout();
        setProvider(null);
    };

    return (
        <div className="App">
            <button onClick={() => login("metamask")}>MetaMask</button>
            <button onClick={() => login("coinbase")}>CoinBase</button>
            <button onClick={() => logout()}>Log Out</button>
        </div>
    );
}

export default App;
