import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { atom, RecoilRoot, useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil';
import axios from 'axios';
import { recoilPersist } from 'recoil-persist';
import { Container, Row, Col, Button, Card, Table, Image, Spinner, Tab, Nav, Tabs, Form } from 'react-bootstrap';
import QRCode from 'qrcode';
import fileDownload from 'js-file-download';

// for some reason recoil-persist causes major babel issues
import 'regenerator-runtime';

/**
 * persistence for wallet
 */
const { persistAtom } = recoilPersist({
	key: 'cj5x',
	storage: sessionStorage
});

const walletState = atom({
	key: 'wallet',
	default: null,
	effects_UNSTABLE: [persistAtom]
});

const transactionState = atom({
	key: 'transaction',
	default: null
});

const transactionsState = atom({
	key: 'transactions',
	default: []
});

function DeadCard() {
	const setWallet = useSetRecoilState(walletState);

	const [isLoading, setIsLoading] = useState(false);

	const materialize = (e) => {
		setIsLoading(true);

		axios.get("http://localhost:8000/wallet/new").then((res) => {
			setWallet((wallet) => res.data);
			setIsLoading(false);
		});

		e.preventDefault();
	};

	const spinnerRoo = () => {
		if (isLoading) return <Spinner animation="border" role="status" size="sm" />;
	}

	return (
		<Card>
			<Card.Body>
				<Card.Title>Wallet</Card.Title>
				<Card.Subtitle>Hit that button below!</Card.Subtitle>
				<Card.Text></Card.Text>
				<Button onClick={materialize} disabled={isLoading}>Generate a Wallet {spinnerRoo()}</Button>
			</Card.Body>
		</Card>
	);
}

class QRCoder extends React.Component {
	constructor(props) {
		super(props);

		this.state = { address: props.address };

		QRCode.toDataURL(this.state.address, {
			width: 640
		}).then(url => {
			this.setState({ src: url });
		});
	}

	render() {
		return <Image style={{ width: '100%' }} src={this.state.src} fluid />
	}
}

function WalletItem() {

	const wallet = useRecoilValue(walletState);

	const onClickExport = (e) => {
		e.preventDefault();

		/**
		 * @todo encrypt and zip!
		 */
		axios.get("http://localhost:8000/wallet/export", {
			responseType: 'blob'
		}).then((res) => {
			fileDownload(res.data, 'cj5xeys.txt');
		});
	};

	return (
		<Card>
			<Card.Body>
				<Card.Title>Wallet</Card.Title>
				<QRCoder address={wallet.address} />
				<Table responsive>
					<tbody>
						<tr>
							<th>Address</th>
							<td style={{ overflowWrap: 'anywhere' }}>{wallet.address}</td>
						</tr>
						<tr>
							<th>Secret</th>
							<td>
								<Button onClick={onClickExport}>Export wallet</Button>
							</td>
						</tr>
						<tr>
							<th>Balance</th>
							<td>&lt;balance&gt;</td>
						</tr>
						<tr>
							<th>Created</th>
							<td>{wallet.created}</td>
						</tr>
					</tbody>
				</Table>
			</Card.Body>
		</Card>
	);
}

function WalletCard() {
	const [wallet] = useRecoilState(walletState);

	if (wallet == null) {
		return <DeadCard />
	} else {
		return <WalletItem />
	}
}

function Wallet() {

	return (
		<WalletCard />
	)
}

function ChainBoard() {

	const [txs, setTxs] = useRecoilState(transactionsState);

	axios.get("http://localhost:8000/transactions/list").then((res) => {
		setTxs(txs => res.data);
	}).catch((err) => {
		console.error(err);
	});

	return (
		<Container>
			<Row>
				<Col>
					<Tabs id="blockchain-stuff" className="mb-3">
						<Tab eventKey="transaction" title="Transaction">
							<TransactionView />
						</Tab>
						<Tab eventKey="transactions" title="Transactions">
							<TransactionsTests transactions={txs} />
						</Tab>
					</Tabs>
				</Col>
			</Row>
		</Container>
	);
}

function TransactionView() {
	const wallet = useRecoilValue(walletState);

	if (wallet) {
		return (
			<TransactionForm />
		);
	} else {
		return (
			<Card>
				<Card.Body>
					<Card.Title>Create a wallet!</Card.Title>
				</Card.Body>
			</Card>
		);
	}
}

function TransactionForm() {
	const [wallet] = useRecoilState(walletState);
	const [tx, setTx] = useState({ ...tx, from: wallet.address });
	
	const [isLoading, setIsLoading] = useState(false);

	const onChangeTo = (e) => {
		setTx((t) => {
			return { ...t, to: e.target.value };
		});
	};

	const onChangeAmount = (e) => {
		setTx((t) => {
			return { ...t, amount: e.target.value };
		});
	};

	const onClickTransaction = (e) => {
		// load em up, ride em out...
		setIsLoading(true);
		axios.post("http://localhost:8000/transaction", tx).then((res) => {
			setTx((t) => null);
			setIsLoading(false);
		}).catch((err) => {
			console.error(err);
		});
	};
	
	const spinnerRoo = () => {
		if (isLoading) return <Spinner animation="border" role="status" size="sm" />;
	}

	return (
		<Form>
			<Form.Group className="mb-3" controlId="to">
				<Form.Label>To</Form.Label>
				<Form.Control type="text" placeholder="" onChange={onChangeTo} onBlur={onChangeTo} />
				<Form.Text className="text-muted">
					To which wallet address are you sending?
					</Form.Text>
			</Form.Group>
			<Form.Group className="mb-3" controlId="amount">
				<Form.Label>Amount</Form.Label>
				<Form.Control type="text" placeholder="1.25" onChange={onChangeAmount} onBlur={onChangeAmount} />
				<Form.Text>
					Enter the amount to send.
					</Form.Text>
			</Form.Group>
			<Button variant="primary" disabled={isLoading} type="button" onClick={onClickTransaction}>Send {spinnerRoo()}</Button>
		</Form>
	);
}

function TransactionsTests(props) {
	const txs = props.transactions;

	return (
		<Table striped>
			<tbody>
				{
					txs.map((t, i) => {
						return (<tr key={'tx' + i}>
							<td>{t.from}</td>
							<td> &gt;&gt; </td>
							<td>{t.to}</td>
							<td>{t.amount}</td>
						</tr>);
					})
				}
			</tbody>
		</Table>
	);
}

class Main extends React.Component {
	render() {

		return (
			<RecoilRoot>
				<Container>
					<Row>
						<Col lg={4}>
							<Wallet />
						</Col>
						<Col>
							<ChainBoard />
						</Col>
					</Row>
				</Container>
			</RecoilRoot>
		);
	}
}

ReactDOM.render(<Main />, document.getElementById('wallet'));