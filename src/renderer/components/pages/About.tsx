interface Props {
    serverVersion: string;
}

export const About = ({ serverVersion }: Props) => {
    return (
        <div style={{ padding: 28, color: "var(--text-secondary)" }}>
            <h2 style={{ color: "var(--text-primary)", margin: "0 0 12px" }}>About</h2>
            <div>Renegade v1.0.0</div>
            <div>Server {serverVersion || "?"}</div>
        </div>
    );
};
