import {
    Body1,
    Card,
    Caption1,
    Divider,
    Link,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import { OpenRegular } from "@fluentui/react-icons";
import iconPath from "../../icon.png";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        flex: 1,
        minHeight: 0,
        padding: "32px",
        overflowY: "auto",
    },
    hero: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "12px",
        padding: "24px 0",
    },
    logo: {
        width: "80px",
        height: "80px",
        borderRadius: tokens.borderRadiusXLarge,
        overflow: "hidden",
        boxShadow: tokens.shadow8,
    },
    logoImg: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    title: {
        fontSize: tokens.fontSizeHero700,
        fontWeight: tokens.fontWeightBold,
    },
    subtitle: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorNeutralForeground3,
        maxWidth: "420px",
        lineHeight: 1.5,
    },
    card: {
        padding: "20px",
        borderRadius: tokens.borderRadiusXLarge,
        boxShadow: tokens.shadow4,
    },
    cardTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        marginBottom: "12px",
    },
    row: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 0",
    },
    label: {
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
    },
    value: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    featureList: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    featureItem: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: tokens.fontSizeBase300,
        color: tokens.colorNeutralForeground2,
    },
    featureDot: {
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: tokens.colorBrandBackground,
        flexShrink: 0,
    },
    footer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "16px 0",
        color: tokens.colorNeutralForeground3,
    },
});

export const About = () => {
    const styles = useStyles();

    return (
        <div className={styles.root}>
            <div className={styles.hero}>
                <div className={styles.logo}>
                    <img
                        className={styles.logoImg}
                        src={iconPath}
                        alt="Renegade"
                    />
                </div>
                <span className={styles.title}>Renegade</span>
                <span className={styles.subtitle}>
                    A modern script executor interface built on top of Xeno.
                </span>
            </div>

            <Card className={styles.card}>
                <div className={styles.cardTitle}>What is Renegade?</div>
                <Body1 style={{ color: tokens.colorNeutralForeground2, lineHeight: 1.6, marginBottom: "12px" }}>
                    Renegade is a custom UI wrapper for the Xeno executor. It provides a clean, modern interface
                    for executing scripts in Roblox, managing clients, and browsing community scripts.
                </Body1>
                <Body1 style={{ color: tokens.colorNeutralForeground2, lineHeight: 1.6 }}>
                    Under the hood, Renegade uses the Xeno DLL to handle the actual script injection and execution.
                    This means you get the power of Xeno with a completely redesigned user experience.
                </Body1>
            </Card>

            <Card className={styles.card}>
                <div className={styles.cardTitle}>Features</div>
                <div className={styles.featureList}>
                    <div className={styles.featureItem}>
                        <span className={styles.featureDot} />
                        Multi-tab script editor with syntax highlighting
                    </div>
                    <div className={styles.featureItem}>
                        <span className={styles.featureDot} />
                        Auto-detect and attach to Roblox clients
                    </div>
                    <div className={styles.featureItem}>
                        <span className={styles.featureDot} />
                        Built-in script hub with trending scripts
                    </div>
                    <div className={styles.featureItem}>
                        <span className={styles.featureDot} />
                        Persistent settings and script history
                    </div>
                    <div className={styles.featureItem}>
                        <span className={styles.featureDot} />
                        Power user mode for advanced diagnostics
                    </div>
                    <div className={styles.featureItem}>
                        <span className={styles.featureDot} />
                        In-app notifications for actions
                    </div>
                </div>
            </Card>

            <Card className={styles.card}>
                <div className={styles.cardTitle}>Credits</div>
                <div className={styles.row}>
                    <span className={styles.label}>Xeno Executor</span>
                    <Link href="https://xeno.now/about" target="_blank" style={{ fontSize: tokens.fontSizeBase300 }}>
                        Link <OpenRegular style={{ fontSize: 12 }} />
                    </Link>
                </div>
                <Divider />
                <div className={styles.row}>
                    <span className={styles.label}>Interface</span>
                    <span className={styles.value}>Renegade</span>
                </div>
            </Card>

            <div className={styles.footer}>
                <Caption1>Renegade v1.0.0</Caption1>
            </div>
        </div>
    );
};
